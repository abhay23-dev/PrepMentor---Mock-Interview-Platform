import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Search } from "lucide-react";



export default function Navbar() {
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const navigate = useNavigate();

    const handleLogout = () => {
        logout();

        navigate({
            to: "/login"
        });
    }

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900">
            <div className="flex h-full items-center justify-between px-6">
                <div>
                    <h1 className="text-2xl font-bold text-blue-500">
                        PrepMentor
                    </h1>
                </div>

                <div className="flex items-center gap-2  rounded-lg bg-slate-800 px-4 py-2">
                    <Search size ={18} />
                    <input
                     placeholder="Search..."
                     className="bg-transparent outline-none"
                    />
                </div>

                <div className="flex items-center gap-6">
                    <button>
                        <Bell size={20} />
                    </button>
                    <span>
                        {user?.name ?? "user"}
                    </span>
                    <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 hover:bg-red-700"
                    >
                        <LogOut />
                        Logout
                    </button>
                </div>
            </div>
        </header>
    )

  
}
