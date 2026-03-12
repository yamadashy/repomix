FROM node:24

ARG TZ
ENV TZ="$TZ"

ARG CLAUDE_CODE_VERSION=latest

# Install basic development tools and iptables/ipset
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  vim \
  fd-find \
  ripgrep \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create symlink for fd (Debian/Ubuntu names it fdfind)
RUN ln -s $(which fdfind) /usr/local/bin/fd

# Install ast-grep
RUN ARCH=$(dpkg --print-architecture) && \
  case "$ARCH" in \
    amd64) AST_ARCH="x86_64-unknown-linux-gnu" ;; \
    arm64) AST_ARCH="aarch64-unknown-linux-gnu" ;; \
    *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
  esac && \
  wget -q "https://github.com/ast-grep/ast-grep/releases/latest/download/app-${AST_ARCH}.zip" -O /tmp/ast-grep.zip && \
  unzip -q /tmp/ast-grep.zip -d /usr/local/bin && \
  rm /tmp/ast-grep.zip

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist shell history (both bash and zsh)
RUN mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && touch /commandhistory/.zsh_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace/repomix /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace/repomix

ARG GIT_DELTA_VERSION=0.18.2
RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/${GIT_DELTA_VERSION}/git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb" && \
  rm "git-delta_${GIT_DELTA_VERSION}_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Set the default editor and visual
ENV EDITOR=nano
ENV VISUAL=nano

# Default powerline10k theme
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export HISTFILE=/commandhistory/.zsh_history" \
  -a "export HISTSIZE=10000" \
  -a "export SAVEHIST=10000" \
  -a "setopt SHARE_HISTORY" \
  -a "setopt HIST_IGNORE_DUPS" \
  -x

# Install Claude
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION}


# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node
