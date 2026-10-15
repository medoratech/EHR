import { useContext } from 'react'
import { DemoStoreContext } from './demoStoreContext'

export function useDemoStore() {
  const store = useContext(DemoStoreContext)
  if (!store) throw new Error('useDemoStore must be used within DemoStoreProvider')
  return store
}
