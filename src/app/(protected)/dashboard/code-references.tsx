"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  filesReferences: {
    fileName: string;
    sourceCode: string;
    summary: string;
  }[];
};

// File type configuration with colors and language mappings
const FILE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; language: string }> = {
  // TypeScript/JavaScript
  ts: { label: "TS", color: "text-blue-700", bgColor: "bg-blue-100", language: "typescript" },
  tsx: { label: "TSX", color: "text-cyan-700", bgColor: "bg-cyan-100", language: "tsx" },
  js: { label: "JS", color: "text-yellow-700", bgColor: "bg-yellow-100", language: "javascript" },
  jsx: { label: "JSX", color: "text-amber-700", bgColor: "bg-amber-100", language: "jsx" },
  mjs: { label: "MJS", color: "text-yellow-600", bgColor: "bg-yellow-50", language: "javascript" },
  
  // Python
  py: { label: "PY", color: "text-green-700", bgColor: "bg-green-100", language: "python" },
  
  // Web
  html: { label: "HTML", color: "text-orange-700", bgColor: "bg-orange-100", language: "html" },
  css: { label: "CSS", color: "text-pink-700", bgColor: "bg-pink-100", language: "css" },
  scss: { label: "SCSS", color: "text-pink-600", bgColor: "bg-pink-50", language: "scss" },
  
  // Data
  json: { label: "JSON", color: "text-orange-600", bgColor: "bg-orange-50", language: "json" },
  yaml: { label: "YAML", color: "text-red-600", bgColor: "bg-red-50", language: "yaml" },
  yml: { label: "YAML", color: "text-red-600", bgColor: "bg-red-50", language: "yaml" },
  
  // Docs
  md: { label: "MD", color: "text-gray-600", bgColor: "bg-gray-100", language: "markdown" },
  
  // Backend
  go: { label: "GO", color: "text-sky-700", bgColor: "bg-sky-100", language: "go" },
  rs: { label: "RS", color: "text-orange-700", bgColor: "bg-orange-100", language: "rust" },
  java: { label: "JAVA", color: "text-red-700", bgColor: "bg-red-100", language: "java" },
  rb: { label: "RB", color: "text-red-600", bgColor: "bg-red-50", language: "ruby" },
  php: { label: "PHP", color: "text-indigo-700", bgColor: "bg-indigo-100", language: "php" },
  
  // Shell
  sh: { label: "SH", color: "text-gray-700", bgColor: "bg-gray-100", language: "bash" },
  bash: { label: "BASH", color: "text-gray-700", bgColor: "bg-gray-100", language: "bash" },
  
  // SQL
  sql: { label: "SQL", color: "text-blue-600", bgColor: "bg-blue-50", language: "sql" },
  prisma: { label: "PRISMA", color: "text-teal-700", bgColor: "bg-teal-100", language: "prisma" },
};

function getFileTypeInfo(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_TYPE_CONFIG[ext] || { label: ext.toUpperCase() || "FILE", color: "text-gray-600", bgColor: "bg-gray-100", language: "text" };
}

function getBaseName(filePath: string) {
  return filePath.split("/").pop() || filePath;
}

const CodeReferences = ({ filesReferences }: Props) => {
  const [tab, setTab] = React.useState(filesReferences[0]?.fileName);

  if (filesReferences.length === 0) return null;

  return (
    <div className="w-full max-w-full md:max-w-[80vw]">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex gap-2 overflow-x-auto rounded-md bg-gray-200 p-1">
          {filesReferences.map((file) => {
            const fileInfo = getFileTypeInfo(file.fileName);
            const baseName = getBaseName(file.fileName);
            return (
              <button
                onClick={() => setTab(file.fileName)}
                key={file.fileName}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  tab === file.fileName
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-300 hover:text-gray-900",
                )}
              >
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-bold",
                  tab === file.fileName 
                    ? "bg-white/20 text-white" 
                    : `${fileInfo.bgColor} ${fileInfo.color}`
                )}>
                  {fileInfo.label}
                </span>
                {baseName}
              </button>
            );
          })}
        </div>
        {filesReferences.map((file) => {
          const fileInfo = getFileTypeInfo(file.fileName);
          return (
            <TabsContent
              key={file.fileName}
              value={file.fileName}
              className="max-h-[40vh] w-full overflow-auto rounded-md"
            >
              <SyntaxHighlighter
                language={fileInfo.language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, maxWidth: "100%" }}
              >
                {file.sourceCode}
              </SyntaxHighlighter>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default CodeReferences;

