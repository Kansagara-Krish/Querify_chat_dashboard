import os
import logging
from typing import Any

try:
    from langchain_openai import ChatOpenAI
except Exception:
    ChatOpenAI = None

try:
    from langchain.chains import RetrievalQA
except Exception:
    RetrievalQA = None

from langchain.prompts import PromptTemplate

logger = logging.getLogger(__name__)

# ---------------- PROMPT (STRICT, NO AUTO-SUMMARY) ----------------

QA_PROMPT = PromptTemplate(
    template="""
You are a precise question-answering assistant.

Rules:
 - Act as a human subject-matter expert, not an AI model.
 - Fully summarize when required; otherwise, answer in 2–3 concise lines if information is limited or not explicitly stated.
 - Follow user instructions exactly and prioritize them over all other guidance.
 - Never mention OpenRouter, APIs, system messages, limitations, or file availability; assume all referenced files are provided.
 - If something is unclear, ask one short, neutral clarification question only.
 - Use a friendly, professional tone and actively ask relevant follow-up questions based on the current topic to improve and continue the conversation.
 - Use emojis sparingly and intentionally to enhance friendliness—never overuse them.
 - Provide structured, clean, and clearly formatted output.
 - Use ASCII-safe bullets (- or numbered lists) to ensure compatibility across editors and terminals.
 - Avoid unnecessary commentary, filler text, or excessive emojis.
 - Don't use ** or * for bold or italics or for point.

Context:
{context}

Question:
{question}

Answer:
""",
    input_variables=["context", "question"],
)

# ---------------- FALLBACK CHAIN ----------------

class SimpleQAChain:
    """Fallback QA chain that checks relevance before returning excerpts."""

    def __init__(self, vectorstore: Any, k: int = 100):
        # Retrieve more documents for better context (increased from 5 to 10)
        self.retriever = vectorstore.as_retriever(search_kwargs={"k": k})
        self.vectorstore = vectorstore

    def run(self, query: str) -> str:
        # First check if it's a pure casual/greeting question
        if self._is_casual_question(query):
            return self._generic_response(query)
        
        # Check if it's a personal/meta question about the user (Krish)
        if self._is_personal_question(query):
            # try to answer from document content first (e.g., "my friend name is sudip")
            try:
                try:
                    docs_with_scores = self.vectorstore.similarity_search_with_score(query, k=15)
                    docs = [doc for doc, score in docs_with_scores if doc is not None]
                except Exception:
                    docs = self.retriever.get_relevant_documents(query)

                extracted = self._extract_personal_answer(query, docs)
                if extracted:
                    return extracted
            except Exception:
                pass

            return self._answer_personal_question(query)
        
        # Check if it's a summarize request
        is_summarize = self._is_summarize_request(query)
        requested_lines = self._extract_requested_lines(query) if is_summarize else 3
        
        try:
            try:
                docs_with_scores = self.vectorstore.similarity_search_with_score(query, k=15)
                docs = [doc for doc, score in docs_with_scores if doc is not None]
            except:
                # Fallback to regular retrieval
                docs = self.retriever.get_relevant_documents(query)
            
            if not docs or len(docs) == 0:
                return "Not found in the document."
            
            if is_summarize:
                # For summarize requests, combine multiple excerpts to get more content
                all_lines = []
                for doc in docs[:10]:  # Get up to 10 relevant sections
                    content = doc.page_content.strip()
                    lines = [line.strip() for line in content.split('\n') if line.strip()]
                    all_lines.extend(lines)
                
                # Return exactly the requested number of lines
                if all_lines:
                    content = '\n'.join(all_lines[:requested_lines])
                else:
                    return "Not found in the document."
            else:
                # Get the most relevant excerpts and find best match
                all_content = []
                for doc in docs[:3]:  # Check first 3 documents
                    all_content.append(doc.page_content.strip())
                
                # Use the most relevant one
                best_doc_content = all_content[0] if all_content else ""
                
                if not best_doc_content:
                    return "Not found in the document."
                
                content = best_doc_content
                
                # Limit to requested lines (default 3)
                lines = content.split('\n')
                if len(lines) > requested_lines:
                    content = '\n'.join(lines[:requested_lines])
            
            # Also limit overall length for conciseness
            if len(content) > 1000:
                content = content[:1000]
                last_period = content.rfind('.')
                if last_period > 800:
                    content = content[:last_period + 1]
                else:
                    content = content + "..."
            
            return content
            
        except Exception as e:
            logger.error("Error retrieving documents: %s", e)
            return "Unable to retrieve information from the document. Please try again."
    
    def _is_summarize_request(self, query: str) -> bool:
        """Check if user is asking for a summary."""
        keywords = ["summarize", "summary", "give me summary", "brief", "overview"]
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in keywords)
    
    def _extract_requested_lines(self, query: str) -> int:
        """Extract the number of lines requested from the query."""
        import re
        
        # Map spelled-out numbers to digits
        word_to_num = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20
        }
        
        query_lower = query.lower()
        
        # Look for numeric patterns: "5 line", "10 lines", "5 lien" (typo), etc.
        numeric_patterns = [
            r'(\d+)\s*line',  # "5 line", "10 lines"
            r'(\d+)\s*lien',  # "5 lien" (typo for line)
            r'(\d+)\s*paragraph',  # "3 paragraph"
        ]
        
        for pattern in numeric_patterns:
            match = re.search(pattern, query_lower)
            if match:
                return int(match.group(1))
        
        # Look for spelled-out numbers: "five line", "ten lines", etc.
        for word, num in word_to_num.items():
            if re.search(rf'{word}\s*(line|lien|paragraph)', query_lower):
                return num
        
        # Default to 5 lines for summary if no specific number given
        return 5
    
    def _is_personal_question(self, query: str) -> bool:
        """Check if question is about the user (Krish)."""
        personal_keywords = ["my name", "who am i", "your name", "krish", "my friend", "friend", "my friend's"]
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in personal_keywords)
    
    def _answer_personal_question(self, query: str) -> str:
        """Answer personal questions about the user."""
        query_lower = query.lower()
        if any(word in query_lower for word in ["my name", "who am i"]):
            return "Your name is Krish."
        elif any(word in query_lower for word in ["who are you", "your name"]):
            return "I'm an AI assistant here to help you find information in your PDF documents."
        return "I'm here to help with your uploaded document and answer your questions."

    def _extract_personal_answer(self, query: str, docs: list) -> str:
        """Try to extract short personal answers (like names) from retrieved docs.

        This function is context-aware: if the user asked "my name" it prefers
        matches for "my name is ..."; if the user asked about a friend it
        prefers friend-related patterns. Returns a polite full-sentence reply
        or empty string when nothing found.
        """
        import re

        q = (query or "").lower()
        want_my_name = "my name" in q or "who am i" in q
        want_friend = "friend" in q

        # Patterns grouped by intent priority
        my_name_patterns = [r"my name is\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 _-]+)"]
        friend_patterns = [
            r"my friend(?:'s)? name is\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 _-]+)",
            r"friend name is\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 _-]+)",
            r"my friend is\s*[:\-]?\s*([A-Za-z][A-Za-z0-9 _-]+)",
        ]

        # If query explicitly asks about my name, try my_name_patterns first
        patterns_order = []
        if want_my_name:
            patterns_order = my_name_patterns + friend_patterns
        elif want_friend:
            patterns_order = friend_patterns + my_name_patterns
        else:
            # default: try both but prefer exact 'my name' then friend
            patterns_order = my_name_patterns + friend_patterns

        for doc in docs:
            text = getattr(doc, 'page_content', '') or str(doc)
            for pat in patterns_order:
                m = re.search(pat, text, flags=re.IGNORECASE)
                if m:
                    name = m.group(1).strip()
                    # Normalize capitalization
                    name = " ".join([w.capitalize() for w in name.split()])
                    if want_friend or (not want_my_name and "friend" in pat):
                        return f"Your friend's name is {name}."
                    else:
                        return f"Your name is {name}."

        return ""
    
    def _is_casual_question(self, query: str) -> bool:
        """Check if query is a casual greeting/farewell ONLY."""
        # Very strict - only pure greetings and thanks
        exact_casual = ["hi", "hello", "hey", "thanks", "thank you", "bye", "goodbye"]
        query_lower = query.lower().strip()
        
        # Check if the entire query (or very close to it) matches a casual phrase
        for word in exact_casual:
            if query_lower == word or query_lower == word + "!":
                return True
        
        # Check for "how are you" variations
        if "how are you" in query_lower and len(query_lower) < 30:
            return True
        
        return False
    
    def _generic_response(self, query: str) -> str:
        """Generate a generic response for non-document questions."""
        # For general chat questions
        if any(word in query.lower() for word in ["hi", "hello", "how are you", "hey", "good morning", "good afternoon", "good evening"]):
            return "I'm doing well, thank you for asking! I'm here to help you find information in your PDF. Feel free to ask me any questions about the document you uploaded."
        elif any(word in query.lower() for word in ["thank", "thanks"]):
            return "You're welcome! Is there anything else you'd like to know about your document?"
        else:
            return "I'm specifically designed to answer questions about your uploaded PDF document. Please ask me something related to the document, or feel free to chat!"


# ---------------- SAFE WRAPPER ----------------

class SafeQAChain:
    """Uses RetrievalQA, falls back to SimpleQAChain on any runtime failure."""

    def __init__(self, retrieval_qa, fallback):
        self.retrieval_qa = retrieval_qa
        self.fallback = fallback

    def run(self, query: str) -> str:
        try:
            return self.retrieval_qa.run(query)
        except Exception as e:
            logger.warning("RetrievalQA failed, falling back: %s", e)
            return self.fallback.run(query)


# ---------------- BUILDER ----------------

def build_qa_chain(vectorstore: Any):
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    fallback_chain = SimpleQAChain(vectorstore)

    if api_key and ChatOpenAI and RetrievalQA:
        try:
            llm = ChatOpenAI(
                model="meta-llama/llama-3-70b-instruct",
                api_key=api_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=0.0,
            )

            retrieval_qa = RetrievalQA.from_chain_type(
                llm=llm,
                retriever=retriever,
                chain_type="stuff",
                chain_type_kwargs={"prompt": QA_PROMPT},
                return_source_documents=False,
            )

            # Return the RetrievalQA chain directly so queries go to the LLM
            return retrieval_qa

        except Exception as e:
            logger.warning("LLM init failed, using fallback: %s", e)

    return fallback_chain
