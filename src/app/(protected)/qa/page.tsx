"use client";

import { api } from "@/trpc/react";
import React from "react";
import AskQuestionCard from "../dashboard/ask-question-card";
import useProject from "@/hooks/use-project";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetHeader,
} from "@/components/ui/sheet";
import CodeReferences from "../dashboard/code-references";
import MDEditor from "@uiw/react-md-editor";

const QAPage = () => {
  const { projectId } = useProject();
  const { data: questions } = api.project.getQuestions.useQuery({ projectId });
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const question = questions?.[questionIndex];
  return (
    <Sheet>
      <AskQuestionCard />
      <div className="h-4"></div>
      <h1 className="text-xl font-semibold">Saved Questions</h1>
      <div className="h-2"></div>
      <div className="flex flex-col gap-2">
        {questions?.map((question, index) => {
          return (
            <React.Fragment key={question.id}>
              <SheetTrigger onClick={() => setQuestionIndex(index)}>
                <div className="flex items-center gap-2 rounded-lg border bg-white p-3 shadow sm:gap-4 sm:p-4">
                  <img
                    className="shrink-0 rounded-full"
                    height={30}
                    width={30}
                    src={question.user.imageUrl ?? ""}
                    alt="imageUrl"
                  />
                  <div className="flex min-w-0 flex-1 flex-col text-left">
                    <div className="flex items-center gap-2">
                      <p className="line-clamp-1 min-w-0 flex-1 text-base font-medium text-gray-700 sm:text-lg">
                        {question.question}
                      </p>
                      <span className="shrink-0 text-xs whitespace-nowrap text-gray-400">
                        {question.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      {question.answer}
                    </p>
                  </div>
                </div>
              </SheetTrigger>
            </React.Fragment>
          );
        })}
      </div>
      {question && (
        <SheetContent className="w-full max-w-full overflow-y-scroll sm:w-auto sm:max-w-[80vw]">
          <SheetHeader className="space-y-4 text-xl sm:text-xl lg:text-3xl">
            <SheetTitle>{question.question}</SheetTitle>
            <div className="overflow-x-auto">
              <MDEditor.Markdown source={question.answer} className="p-2.5" />
            </div>
            <div className="overflow-x-auto">
              <CodeReferences
                filesReferences={(question.filesReferences ?? []) as any}
              />
            </div>
          </SheetHeader>
        </SheetContent>
      )}
    </Sheet>
  );
};

export default QAPage;
