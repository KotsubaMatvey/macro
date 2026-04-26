export default function GeoboardLoading() {
 return <div className='grid h-screen grid-rows-[58px_minmax(0,1fr)_28px] bg-[#060a0f] p-3 text-[#7a9ab8]'>
  <div className='animate-pulse rounded-[6px] border border-[#1a2535] bg-[#0a1018]' />
  <div className='grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]'>
   <div className='relative animate-pulse rounded-[6px] border border-[#1a2535] bg-[#0a1018]'>
    <div className='absolute left-3 top-3 h-12 w-72 rounded-[6px] bg-white/[0.035]' />
    <div className='absolute inset-x-8 top-1/2 h-px bg-[#1a2535]' />
    <div className='absolute inset-y-8 left-1/2 w-px bg-[#1a2535]' />
   </div>
   <div className='grid animate-pulse grid-rows-[140px_110px_minmax(0,1fr)] gap-3 rounded-[6px] border border-[#1a2535] bg-[#0a1018] p-3'>
    <div className='rounded-[6px] bg-white/[0.03]' />
    <div className='rounded-[6px] bg-white/[0.025]' />
    <div className='rounded-[6px] bg-white/[0.02]' />
   </div>
  </div>
  <div className='animate-pulse rounded-[6px] border border-[#1a2535] bg-[#0a1018]' />
 </div>
}
