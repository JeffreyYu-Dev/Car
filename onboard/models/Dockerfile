# ---------------------------------------------------------------------------
# On-board query-generator model server (vehicle side).
#
# llama.cpp serving Gemma 3 1B — the "small model in the car" from the paper.
# It condenses the driver profile plus the captured fault data into one short
# query, which is the only thing that goes over the satellite link.
#
# 1B at Q4_K_M is the point: it's small enough to run on cheap in-car hardware
# (the paper's prototype used a Jetson Nano), and small enough to run on a
# plain CPU container here.
#
# The .gguf is downloaded at build time rather than committed: it's 770MB, and
# baking it into the image means a cold start doesn't have to fetch it.
# ---------------------------------------------------------------------------
FROM ghcr.io/ggml-org/llama.cpp:server

ARG MODEL_REPO=ggml-org/gemma-3-1b-it-GGUF
ARG MODEL_FILE=gemma-3-1b-it-Q4_K_M.gguf

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
  --port \"${PORT:-8080}\" \
  ${LLAMA_EXTRA_ARGS}"]
