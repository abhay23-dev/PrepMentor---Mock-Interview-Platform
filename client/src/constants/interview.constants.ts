import type { Difficulty, Topic } from "@/types/interview.types";
 
export const TOPICS: { value: Topic; label: string }[] = [
  { value: "dbms", label: "DBMS" },
  { value: "os", label: "Operating Systems" },
  { value: "cn", label: "Computer Networks" },
  { value: "oops", label: "OOP" },
  { value: "react", label: "React" },
  { value: "node", label: "Node.js" },
  { value: "other", label: "Other" },
];
 
export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];
 
export function getTopicLabel(topic: Topic): string {
  return TOPICS.find((t) => t.value === topic)?.label ?? topic;
}