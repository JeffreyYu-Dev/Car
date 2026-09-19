# ---------------------------------------------------------------------------
# Embedding model server (cloud side).
#
# llama.cpp in --embedding mode, serving Qwen3-Embedding-0.6B. This is what
# turns query text into the 1024-dimension vectors the RAG pipeline searches
# with, for both historical-query matching and knowledge retrieval.
#
# The .gguf is downloaded at build time rather than committed: it's 610MB, and
# baking it into the image means a cold start doesn't have to fetch it.
# ---------------------------------------------------------------------------
FROM ghcr.io/ggml-org/llama.cpp:server

ARG MODEL_REPO=Qwen/Qwen3-Embedding-0.6B-GGUF
ARG MODEL_FILE=Qwen3-Embedding-0.6B-Q8_0.gguf

ENV MODEL_PATH=/models/${MODEL_FILE}

USER root
RUN mkdir -p /models \
 && curl -fL --retry 5 --retry-delay 5 --retry-connrefused \
      -o "${MODEL_PATH}" \
      "https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILE}" \
 && test -s "${MODEL_PATH}"

# The base image sets the server binary as its ENTRYPOINT, which leaves no
# shell to expand $PORT with. Clearing it and going through sh does.
#
# BIND_HOST exists because Railway's private network is IPv6-only: a server
# bound to 0.0.0.0 is unreachable at <service>.railway.internal however
# healthy it looks. Set BIND_HOST=:: there; docker compose keeps the default.
ENTRYPOINT []
CMD ["/bin/sh", "-c", "exec $(command -v llama-server || echo /app/llama-server) \
  --model \"$MODEL_PATH\" \
  --host \"${BIND_HOST:-0.0.0.0}\" \
  --port \"${PORT:-5173}\" \
  --embedding \
  ${LLAMA_EXTRA_ARGS}"]
