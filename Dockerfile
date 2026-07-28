ARG NODE_VERSION=24
FROM node:${NODE_VERSION}

ARG UID=1000
ARG GID=1000

RUN if ! getent group ${GID} > /dev/null 2>&1; then groupadd -g ${GID} sdk; fi \
    && if ! getent passwd ${UID} > /dev/null 2>&1; then useradd -m -u ${UID} -g ${GID} sdk; fi \
    && mkdir -p /usr/src/node_modules \
    && chown -R ${UID}:${GID} /usr/src

WORKDIR /usr/src
USER ${UID}

# Install the dependencies at build time so the container is ready to run npm scripts without a
# manual `npm ci`. Only the manifests are copied here — the sources arrive through the bind mount
# in docker-compose.yml, and compose seeds its own /usr/src/node_modules volume from this layer,
# so the mount never hides them.
COPY --chown=${UID}:${GID} package.json package-lock.json ./
RUN npm ci

ENTRYPOINT ["tail", "-f", "/dev/null"]
