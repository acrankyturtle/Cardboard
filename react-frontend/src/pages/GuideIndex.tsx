import Header from "../components/Header.tsx";
import ReactMarkdown from "react-markdown";
import guideContent from "@root/GUIDE.md?raw";
import { ReactNode, useRef } from "react";
import type { Components } from "react-markdown";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function getTextContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  if (children && typeof children === "object" && "props" in children)
    return getTextContent((children as { props: { children?: ReactNode } }).props.children);
  return "";
}

export function GuideIndex() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const components: Components = {
    h1: ({ children, ...props }) => {
      const id = slugify(getTextContent(children));
      return (
        <h1 id={id} {...props}>
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }) => {
      const id = slugify(getTextContent(children));
      return (
        <h2 id={id} {...props}>
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }) => {
      const id = slugify(getTextContent(children));
      return (
        <h3 id={id} {...props}>
          {children}
        </h3>
      );
    },
    a: ({ children, href, ...props }) => {
      if (href?.startsWith("#")) {
        return (
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              const target = scrollRef.current?.querySelector(href!);
              target?.scrollIntoView({ behavior: "smooth" });
            }}
            {...props}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
  };

  return (
    <div className="flex size-full flex-col">
      <Header className="flex items-center">Guide</Header>
      <div ref={scrollRef} className="grow overflow-y-auto px-10 py-6">
        <div className="prose prose-invert max-w-4xl">
          <ReactMarkdown components={components}>{guideContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
