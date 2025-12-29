from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from reg.embeddings import get_embeddings, BasicEmbeddings
try:
    from langchain.vectorstores import FAISS
except Exception:
    # Some environments provide FAISS via community package
    from langchain_community.vectorstores import FAISS
import logging

logger = logging.getLogger(__name__)


def load_file_to_vectorstore(file_path: str):
    """Load a file (pdf, txt, docx) and create a FAISS vectorstore.

    The function auto-detects the loader based on file extension and
    falls back to a text loader when unsure.
    """
    try:
        fname = file_path.lower()
        if fname.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
            docs = loader.load()
        elif fname.endswith(".txt"):
            loader = TextLoader(file_path, encoding="utf8")
            docs = loader.load()
        elif fname.endswith(".docx") or fname.endswith(".doc"):
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
        else:
            # Last resort: try text loader
            try:
                loader = TextLoader(file_path, encoding="utf8")
                docs = loader.load()
            except Exception as e:
                logger.error("Unsupported file type or failed to load: %s", e)
                raise

        # Use larger chunks to preserve context and meaning
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        chunks = splitter.split_documents(docs)

        embeddings = get_embeddings()

        try:
            return FAISS.from_documents(chunks, embeddings)
        except Exception as e:
            logger.warning("Embeddings API failed: %s. Falling back to BasicEmbeddings.", e)
            fallback_embeddings = BasicEmbeddings(dim=32)
            return FAISS.from_documents(chunks, fallback_embeddings)

    except Exception as e:
        logger.error("Error loading file to vectorstore: %s", e)
        raise
