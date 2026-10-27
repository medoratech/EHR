import { useContext } from 'react'
import { EhrContext } from './ehrStoreContext'

export function useEhr() {
  const store = useContext(EhrContext)
  if (!store) throw new Error('useEhr must be used within EhrProvider')
  return store
}
