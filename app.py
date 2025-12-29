import os
import time
import traceback
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename

from reg.loader import load_file_to_vectorstore
from reg.chain import build_qa_chain

load_dotenv()

if os.getenv("OPENROUTER_API_KEY") and not os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = os.environ.get("OPENROUTER_API_KEY")
    os.environ["OPENAI_API_BASE"] = os.environ.get("OPENAI_API_BASE", "https://openrouter.ai/api/v1")

app = Flask(__name__)

vectorstore = None
qa_chain = None

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    global vectorstore, qa_chain

    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    os.makedirs(os.path.join("data", "pdfs"), exist_ok=True)
    filename = secure_filename(file.filename)
    path = os.path.join("data/pdfs", filename)
    file.save(path)

    vectorstore = load_file_to_vectorstore(path)
    qa_chain = build_qa_chain(vectorstore)
    
    welcome_message = f"✓ Welcome! '{filename}' has been loaded successfully. You can now ask questions about it."

    return jsonify({"status": "file processed successfully", "initial_reply": welcome_message, "filename": filename})

@app.route("/chat", methods=["POST"])
def chat():
    global qa_chain
    if qa_chain is None:
        return jsonify({"error": "No file processed. POST /upload with a file first."}), 400

    # accept either `message` or `query` from the client
    try:
        payload = request.get_json(force=True)
    except Exception:
        payload = request.json if request.json else {}

    query = None
    if isinstance(payload, dict):
        query = payload.get("message") or payload.get("query")

    if not query:
        return jsonify({"error": "Missing `message` in request body."}), 400

    try:
        # run the QA chain with server-side retries to avoid transient failures
        import time, traceback

        last_exc = None
        last_tb = None
        for attempt in range(1, 4):
            try:
                result = qa_chain.run(query)
                # If retrieval chains sometimes return dicts, try to pick useful fields
                if isinstance(result, dict):
                    text = result.get("answer") or result.get("result") or str(result)
                else:
                     text = str(result)

                # treat empty/placeholder responses as transient
                if text and text.strip() and text.strip().lower() not in ("none", "n/a", "not found", ""):
                    return jsonify({"response": text})

                last_exc = Exception("Empty response from QA chain")
                last_tb = traceback.format_exc()
                time.sleep(0.25 * attempt)
                continue

            except Exception as e:
                last_exc = e
                last_tb = traceback.format_exc()
                app.logger.warning("qa_chain.run attempt %s failed: %s", attempt, e)
                time.sleep(0.25 * attempt)
                continue

        # all retries failed
        app.logger.error("/chat: all retries failed. last error: %s", last_exc)
        return jsonify({"error": "Server error while processing the query.", "detail": str(last_exc), "trace": last_tb}), 500
    except Exception as e:
        # include traceback to help debugging (safe in local dev)
        import traceback
        tb = traceback.format_exc()
        app.logger.error("Error in /chat: %s", tb)
        return jsonify({"error": "Server error while processing the query.", "detail": str(e), "trace": tb}), 500


@app.route("/profile", methods=["GET", "POST"])
def profile():
    """Handle user profile operations"""
    if request.method == "POST":
        try:
            data = request.get_json()
            # Store profile data (in production, this would be saved to a database)
            profile_data = {
                "name": data.get("name", ""),
                "email": data.get("email", ""),
                "phone": data.get("phone", ""),
                "bio": data.get("bio", "")
            }
            # For now, we just acknowledge the profile update
            return jsonify({"status": "success", "message": "Profile saved successfully", "profile": profile_data}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    else:
        # GET request - return empty profile (client uses localStorage)
        return jsonify({"status": "success", "message": "Profile endpoint ready"}), 200


@app.route("/debug_retrieval", methods=["GET"])
def debug_retrieval():
    """Debug endpoint: returns top-k retrieved chunks for a query.

    Usage: GET /debug_retrieval?query=...&k=5
    """
    global vectorstore
    if vectorstore is None:
        return jsonify({"error": "No vectorstore ready. Upload a document first."}), 400

    q = request.args.get("query")
    if not q:
        return jsonify({"error": "Missing query parameter."}), 400

    try:
        k = int(request.args.get("k", 5))
    except Exception:
        k = 5

    try:
        # try similarity_search_with_score if available
        try:
            docs_with_scores = vectorstore.similarity_search_with_score(q, k=k)
            items = []
            for doc, score in docs_with_scores:
                items.append({"score": float(score), "text": getattr(doc, 'page_content', str(doc))})
        except Exception:
            docs = vectorstore.as_retriever().get_relevant_documents(q)
            items = [{"score": None, "text": getattr(d, 'page_content', str(d))} for d in docs[:k]]

        return jsonify({"query": q, "results": items})
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        app.logger.error("Error in /debug_retrieval: %s", tb)
        return jsonify({"error": "Retrieval failed.", "detail": str(e), "trace": tb}), 500

if __name__ == "__main__":
    app.run(debug=True)
