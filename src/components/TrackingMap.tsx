import dynamic from 'next/dynamic'
import { TrackingMapProps } from './TrackingMapClient'

const TrackingMapClient = dynamic(() => import('./TrackingMapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9' }}>
      <p style={{ color: '#64748B', fontWeight: 600 }}>Carregando mapa...</p>
    </div>
  )
})

export default function TrackingMap(props: TrackingMapProps) {
  return <TrackingMapClient {...props} />
}
