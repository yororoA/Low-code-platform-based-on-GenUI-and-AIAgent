'use client'

import { useState, useCallback } from "react"
import { EyeIcon, EyeOffIcon, CheckIcon, LoaderIcon, DownloadIcon, UploadIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STORAGE_KEY } from "@/lib/llmConfig"
import { DBManager } from "@/lib/dbtest"

// ======================== Provider Defaults ========================
const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; modelName: string }> = {
  openai: { baseUrl: "", modelName: "gpt-4o" },
  google: { baseUrl: "", modelName: "gemini-2.0-flash" },
  anthropic: { baseUrl: "", modelName: "claude-sonnet-4-20250514" },
  deepseek: { baseUrl: "https://api.deepseek.com", modelName: "deepseek-chat" },
  qwen: { baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", modelName: "qwen-max" },
  zai: { baseUrl: "https://open.bigmodel.cn/api/paas/v4", modelName: "glm-4-plus" },
  minimax: { baseUrl: "https://api.minimax.chat/v1", modelName: "minimax-01" },
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  qwen: "Qwen (通义千问)",
  zai: "ZAI (智谱)",
  minimax: "MiniMax",
}

interface LlmConfig {
  provider: string
  apiKey: string
  baseUrl: string
  modelName: string
}

function loadConfig(): LlmConfig {
  if (typeof window === "undefined") {
    return { provider: "openai", apiKey: "", baseUrl: "", modelName: "gpt-4o" }
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as LlmConfig
    }
  } catch {
    // ignore
  }
  return { provider: "openai", apiKey: "", baseUrl: "", modelName: "gpt-4o" }
}

export default function SettingsPage() {
  const [config, setConfig] = useState<LlmConfig>(loadConfig)
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle")
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [testError, setTestError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [dataStatus, setDataStatus] = useState<"idle" | "exporting" | "importing" | "exported" | "imported" | "error">("idle")
  const [dataError, setDataError] = useState("")

  const handleProviderChange = useCallback((provider: string) => {
    const defaults = PROVIDER_DEFAULTS[provider]
    setConfig(prev => ({
      ...prev,
      provider,
      baseUrl: defaults?.baseUrl || "",
      modelName: defaults?.modelName || "gpt-4o",
    }))
    setSaveStatus("idle")
  }, [])

  const handleFieldChange = useCallback((field: keyof LlmConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
    setSaveStatus("idle")
    // Clear test error when user modifies fields
    if (testStatus === "error") {
      setTestStatus("idle")
      setTestError("")
    }
  }, [testStatus])

  const handleSave = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      setSaveStatus("saved")
      setSaveError("")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch (e) {
      setSaveStatus("error")
      setSaveError(e instanceof Error ? e.message : "保存失败")
    }
  }, [config])

  const handleTestConnection = useCallback(async () => {
    if (!config.apiKey) {
      setTestStatus("error")
      setTestError("请先输入 API Key")
      return
    }

    setTestStatus("testing")
    setTestError("")

    try {
      const response = await fetch("/api/chat/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl || undefined,
          modelName: config.modelName || undefined,
        }),
      })
      const data = await response.json()

      if (data.success) {
        setTestStatus("success")
        setTimeout(() => setTestStatus("idle"), 5000)
      } else {
        setTestStatus("error")
        setTestError(data.error || "连接测试失败")
      }
    } catch (error) {
      setTestStatus("error")
      setTestError(error instanceof Error ? error.message : "连接测试失败")
    }
    // Error messages persist until the user takes another action
  }, [config])

  const handleExport = useCallback(async () => {
    setDataStatus("exporting")
    setDataError("")
    try {
      await DBManager.execute({ operationType: "open" })
      const conversations = await DBManager.execute({
        operationType: "getAllByIndex",
        store_name: "conversations",
        indexName: "timestampIndex",
      })

      const indexedDBRef = globalThis.indexedDB
      if (!indexedDBRef) throw new Error("IndexedDB is not available")

      const workflows: unknown[] = await new Promise((resolve, reject) => {
        const request = indexedDBRef.open("workflow-db", 1)
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains("workflow-store")) {
            db.close()
            resolve([])
            return
          }
          const tx = db.transaction("workflow-store", "readonly")
          const store = tx.objectStore("workflow-store")
          const getAllReq = store.getAll()
          getAllReq.onsuccess = () => {
            db.close()
            resolve(getAllReq.result || [])
          }
          getAllReq.onerror = () => {
            db.close()
            reject(getAllReq.error)
          }
        }
        request.onerror = () => reject(request.error)
      })

      const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        conversations: (conversations as unknown[]) || [],
        workflows: workflows || [],
      }

      const jsonStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `genui-studio-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDataStatus("exported")
      setTimeout(() => setDataStatus("idle"), 3000)
    } catch (e) {
      setDataStatus("error")
      setDataError(e instanceof Error ? e.message : "导出失败")
    }
  }, [])

  const handleImport = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setDataStatus("importing")
      setDataError("")

      try {
        const text = await file.text()
        const data = JSON.parse(text)

        if (!data.version || (!data.conversations && !data.workflows)) {
          throw new Error("数据格式无效")
        }

        if (data.conversations && Array.isArray(data.conversations)) {
          await DBManager.execute({ operationType: "open" })
          for (const item of data.conversations) {
            await DBManager.execute({
              operationType: "update",
              store_name: "conversations",
              data: item,
            })
          }
        }

        if (data.workflows && Array.isArray(data.workflows)) {
          const indexedDBRef = globalThis.indexedDB
          if (!indexedDBRef) throw new Error("IndexedDB is not available")

          await new Promise<void>((resolve, reject) => {
            const request = indexedDBRef.open("workflow-db", 1)
            request.onsuccess = () => {
              const db = request.result
              if (!db.objectStoreNames.contains("workflow-store")) {
                db.close()
                resolve()
                return
              }
              const tx = db.transaction("workflow-store", "readwrite")
              const store = tx.objectStore("workflow-store")
              for (const item of data.workflows) {
                store.put(item)
              }
              tx.oncomplete = () => {
                db.close()
                resolve()
              }
              tx.onerror = () => {
                db.close()
                reject(tx.error)
              }
            }
            request.onerror = () => reject(request.error)
          })
        }

        setDataStatus("imported")
        setTimeout(() => {
          setDataStatus("idle")
          window.location.reload()
        }, 1500)
      } catch (e) {
        setDataStatus("error")
        setDataError(e instanceof Error ? e.message : "导入失败")
      }
    }
    input.click()
  }, [])

  return (
    <div className="flex h-full items-start justify-center overflow-auto p-8">
      <div className="w-full max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">模型设置</CardTitle>
          <CardDescription>
            配置 LLM 模型厂商和 API Key。配置保存在浏览器本地，API Key 不会上传到服务器存储。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 模型厂商 */}
          <div className="space-y-2">
            <Label htmlFor="provider">模型厂商</Label>
            <Select value={config.provider} onValueChange={handleProviderChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择模型厂商" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="输入你的 API Key"
                value={config.apiKey}
                onChange={(e) => handleFieldChange("apiKey", e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowApiKey(prev => !prev)}
              >
                {showApiKey ? (
                  <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              API Key 仅保存在浏览器本地，不会上传到服务器。
            </p>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL（可选）</Label>
            <Input
              id="baseUrl"
              type="text"
              placeholder="自定义 API 地址"
              value={config.baseUrl}
              onChange={(e) => handleFieldChange("baseUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              选择厂商后会自动填充默认地址，你也可以修改为自定义代理地址。
            </p>
          </div>

          {/* 模型名称 */}
          <div className="space-y-2">
            <Label htmlFor="modelName">模型名称（可选）</Label>
            <Input
              id="modelName"
              type="text"
              placeholder="自定义模型名称"
              value={config.modelName}
              onChange={(e) => handleFieldChange("modelName", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              选择厂商后会自动填充默认模型，你也可以修改为其他模型。
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1">
              {saveStatus === "saved" ? (
                <>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  已保存
                </>
              ) : (
                "保存设置"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="flex-1"
            >
              {testStatus === "testing" ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : testStatus === "success" ? (
                <>
                  <CheckIcon className="mr-2 h-4 w-4 text-green-500" />
                  连接成功
                </>
              ) : (
                "测试连接"
              )}
            </Button>
          </div>

          {/* 测试错误信息 */}
          {testStatus === "error" && testError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive font-medium">连接测试失败</p>
              <p className="text-xs text-destructive/80 mt-1 break-all">{testError}</p>
            </div>
          )}

          {/* 保存错误信息 */}
          {saveStatus === "error" && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{saveError || "保存失败，请重试。"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">数据管理</CardTitle>
          <CardDescription>
            导出或导入你的对话历史和工作流项目数据。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={dataStatus === "exporting" || dataStatus === "importing"}
              className="flex-1"
            >
              {dataStatus === "exporting" ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  导出数据
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleImport}
              disabled={dataStatus === "exporting" || dataStatus === "importing"}
              className="flex-1"
            >
              {dataStatus === "importing" ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  导入数据
                </>
              )}
            </Button>
          </div>

          {dataStatus === "exported" && (
            <p className="text-sm text-green-600">数据导出成功</p>
          )}
          {dataStatus === "imported" && (
            <p className="text-sm text-green-600">数据导入成功，页面即将刷新...</p>
          )}
          {dataStatus === "error" && dataError && (
            <p className="text-sm text-destructive">{dataError}</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
