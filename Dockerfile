ARG NODE_VERSION=20
FROM node:${NODE_VERSION}

ARG UID=1000
ARG GID=1000

RUN if ! getent group ${GID} > /dev/null 2>&1; then groupadd -g ${GID} sdk; fi \
    && if ! getent passwd ${UID} > /dev/null 2>&1; then useradd -m -u ${UID} -g ${GID} sdk; fi \
    && mkdir -p /usr/src/node_modules \
    && chown -R ${UID}:${GID} /usr/src

WORKDIR /usr/src
USER ${UID}

ENTRYPOINT ["tail", "-f", "/dev/null"]
