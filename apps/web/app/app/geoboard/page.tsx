import { PageShell } from '@/components/app/chrome'
import { GeoboardShell } from '@/components/geoboard/GeoboardShell'

export default function GeoboardPage() {
 return <PageShell title='GEOBOARD // GLOBAL MACRO AOR' subtitle='Global macro tactical surface.' active='geoboard' hideTopbar contentClassName='min-w-0 px-0 py-0 md:px-0 xl:px-0'><GeoboardShell /></PageShell>
}
