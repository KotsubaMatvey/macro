'use client'

export default function EventDetailError(props: { error: Error; reset: () => void }) {
 return (
 <div className='rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-200'>
 <div className='font-medium'>Failed to load event detail.</div>
 <div className='mt-2 text-rose-100/90'>{props.error.message}</div>
 <button onClick={props.reset} className='mt-4 rounded-lg border border-rose-300/40 px-3 py-2 text-xs text-rose-100'>Retry</button>
 </div>
 )
}
