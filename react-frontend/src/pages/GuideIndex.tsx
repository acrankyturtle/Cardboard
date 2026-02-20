import Header from "../components/Header.tsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import guideContent from "@root/GUIDE.md?raw";
import ck130GuideContent from "@root/GUIDE-CK1-30.md?raw";
import { ReactNode, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import type { Components } from "react-markdown";

const guideRoutes: Record<string, string> = {
  "GUIDE.md": "/guide",
  "GUIDE-CK1-30.md": "/guide/ck1-30",
};

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
    return getTextContent(
      (children as { props: { children?: ReactNode } }).props.children,
    );
  return "";
}

function GuidePage({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const target = scrollRef.current?.querySelector(hash);
      target?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

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
      const internalRoute = href ? guideRoutes[href] : undefined;
      if (internalRoute) {
        return (
          <a
            href={internalRoute}
            onClick={(e) => {
              e.preventDefault();
              navigate(internalRoute);
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
      <Header className="flex items-center">{title}</Header>
      <div ref={scrollRef} className="grow overflow-y-auto px-10 py-6">
        <div className="prose prose-invert max-w-4xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export function GuideIndex() {
  return <GuidePage title="Guide" content={guideContent} />;
}

export function GuideCK130() {
  return <GuidePage title="CK1-30 Guide" content={ck130GuideContent} />;
}
