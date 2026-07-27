import QuickActions from "@/components/Dashboard/QuickActions";
import RecentPracticeSessions from "@/components/Dashboard/RecentPracticeSessions";
import StatCard from "@/components/Dashboard/StatCard";
import WelcomeBanner from "@/components/Dashboard/WelcomeBanner";
import { BarChart, CheckCircle, Flame, Mic } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title = "Interviews"
          value="12"
          icon={<Mic size={28} />}
        />
        <StatCard
          title = "Average Score"
          value="84%"
          icon={<BarChart size={28} />}
        />
        <StatCard
          title = "Current Streak"
          value="7 days"
          icon={<Flame size={28} />}
        />
        <StatCard
          title = "Completed"
          value="46"
          icon={<CheckCircle size={28} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <QuickActions />
        <RecentPracticeSessions />
      </div>
    </div>
  );
}