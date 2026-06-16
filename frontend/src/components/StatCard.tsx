import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "gray";
  subtitle?: string;
}

const colorMap = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  gray: "bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

const valueColorMap = {
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-purple-600 dark:text-purple-400",
  gray: "text-gray-700 dark:text-gray-300",
};

export default function StatCard({ title, value, icon: Icon, color = "blue", subtitle }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 truncate">{title}</p>
          <p className={clsx("text-2xl font-bold", valueColorMap[color])}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3", colorMap[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
