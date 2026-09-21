import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

md.renderer.rules.link_open = (tokens, index, options, _env, self) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return self.renderToken(tokens, index, options);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}
