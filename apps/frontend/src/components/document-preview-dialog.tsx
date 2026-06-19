import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DocumentPreviewDialogProps {
  title: string
  url: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif)$/i.test(url)
}

export function DocumentPreviewDialog({ title, url, open, onOpenChange }: DocumentPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-md border bg-muted">
          {url ? (
            isImageUrl(url) ? (
              <img src={url} alt={title} className="mx-auto h-full object-contain" />
            ) : (
              <iframe src={url} title={title} className="h-full w-full" />
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No document available
            </div>
          )}
        </div>

        {url && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
