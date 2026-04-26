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
 h("div", { className: "mx-auto max-w-3xl rounded-[10px] border border-rose-500/20 bg-rose-500/5 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.34)]" }, [
 h("div", { key: "label", className: "text-[10px] uppercase tracking-[0.2em] text-rose-300" }, "Route degraded"),
 h("div", { key: "title", className: "mt-3 text-[18px] font-semibold text-white" }, "The workstation panel failed to load"),
 h("p", { key: "body", className: "mt-2 text-[12px] leading-6 text-slate-300" }, props.error.message ? props.error.message : "Unexpected route failure. Retry the route or inspect Data Sources if provider rows are degraded."),
 h("button", { key: "retry", type: "button", onClick: props.reset, className: "mt-5 desk-tab desk-tab-active" }, "Retry route"),
 ])
 )
}
