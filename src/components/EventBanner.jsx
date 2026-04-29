import { Users } from "lucide-react";

export default function EventBanner({ eventName, ownerName }) {
  return (
    <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
        <Users className="w-5 h-5 text-accent" />
      </div>
      <div>
        <p className="text-xs text-accent font-semibold uppercase tracking-wider">Group Participation</p>
        <p className="text-sm font-medium">You are joining: {ownerName}'s {eventName}</p>
      </div>
    </div>
  );
}