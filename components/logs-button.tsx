"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ClipboardList } from "lucide-react"
import LogsPopup from "./logs-popup"

export default function LogsButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="bg-gray-700 hover:bg-gray-600 border-gray-600"
      >
        <ClipboardList className="mr-2 h-4 w-4" />
        View Logs
      </Button>
      <LogsPopup open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
