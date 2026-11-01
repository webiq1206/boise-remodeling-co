"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { useToast } from "@/hooks/use-toast"

const load = () => import("@/components/ui/toaster").then((m) => m.Toaster)
const Toaster = dynamic(load, { ssr: false })

/**
 * The toast viewport, with the Radix toaster loaded only when a toast is raised.
 *
 * Every page mounted the Radix ToastProvider, which sets state from a ref
 * callback as it mounts. Inside the hydration commit that forced a synchronous
 * re-render, and React then flushed every passive effect on the page in the
 * same long task. Until the first toast this renders the same empty
 * "Notifications (F8)" region the viewport rendered, F8 still moves focus to
 * it, and the toaster code loads on the first interaction so a toast raised
 * by a submit does not wait for it. Toasts are kept by the store, so one
 * raised before the toaster mounts is shown when it does.
 */
export function DeferredToaster() {
  const { toasts } = useToast()
  const [active, setActive] = useState(false)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (toasts.length > 0) setActive(true)
  }, [toasts.length])

  useEffect(() => {
    if (active) return
    const focusOnHotkey = (event: KeyboardEvent) => {
      if (event.code === "F8") list.current?.focus()
    }
    const preload = () => {
      void load()
    }
    document.addEventListener("keydown", focusOnHotkey)
    window.addEventListener("pointerdown", preload, { once: true, passive: true })
    window.addEventListener("keydown", preload, { once: true })
    return () => {
      document.removeEventListener("keydown", focusOnHotkey)
      window.removeEventListener("pointerdown", preload)
      window.removeEventListener("keydown", preload)
    }
  }, [active])

  if (active) return <Toaster />
  return (
    <div role="region" aria-label="Notifications (F8)" tabIndex={-1} style={{ pointerEvents: "none" }}>
      <ol
        ref={list}
        tabIndex={-1}
        className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
      />
    </div>
  )
}
