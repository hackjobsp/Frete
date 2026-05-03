'use client'

import dynamic from 'next/dynamic'

const DashboardMap = dynamic(() => import('./DashboardMap'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )
})

export default DashboardMap
