import { useAuthStore } from "@/store/authStore"


export default function WelcomeBanner() {
    const user = useAuthStore(state => state.user);

    return (
        <section className="rounded-xl bg-slate-900 border-slate-800 p-8 shadow-lg">
            <h1 className="text-3xl font-bold text-white">
                Welcome back, {user?.name ?? "User"}
            </h1>
            <p className="mt-3 text-slate-400">
                Ready to ace your next interview today? Continue practicing and improve
                your performance with AI-powered mock interviews.
            </p>
        </section>
    )
}
