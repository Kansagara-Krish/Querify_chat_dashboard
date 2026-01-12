from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from reg.embeddings import get_embeddings, BasicEmbeddings
import logging

logger = logging.getLogger(__name__)


def load_file_to_vectorstore(file_path: str):
    """Load a file (pdf, txt, docx) and create a FAISS vectorstore.

    The function auto-detects the loader based on file extension and
    falls back to a text loader when unsure. Adds source filename metadata.
    """
    try:
        import os
        fname = file_path.lower()
        source_filename = os.path.basename(file_path)
        
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
        
        # Add source filename metadata to all documents
        for doc in docs:
            if doc.metadata is None:
                doc.metadata = {}
            doc.metadata["source"] = source_filename

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
