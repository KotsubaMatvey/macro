"use client"

import { createElement as h, useEffect } from "react"

interface AppErrorProps {
 error: Error
 reset: VoidFunction
}

export default function AppError(props: AppErrorProps) {
 useEffect(function () {
 console.error(props.error)
 }, [props.error])

 return h("main", { className: "min-h-screen bg-[#05070b] px-5 py-10 text-slate-300" },
 h("div", { className: "mx-auto max-w-3xl rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6" }, [
 h("div", { key: "label", className: "text-[11px] uppercase tracking-[0.18em] text-rose-300" }, "Route error"),
 h("div", { key: "title", className: "mt-4 text-2xl font-semibold text-white" }, "The workstation panel failed to load"),
 h("p", { key: "body", className: "mt-3 text-sm leading-7 text-slate-300" }, props.error.message ? props.error.message : "Unexpected route failure."),
 h("button", { key: "retry", type: "button", onClick: props.reset, className: "mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]" }, "Retry route"),
 ])
 )
}
