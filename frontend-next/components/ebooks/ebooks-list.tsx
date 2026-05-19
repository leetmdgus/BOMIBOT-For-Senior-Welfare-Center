import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"

import { Book, CategoryStyles } from "@/services/ebooks.types"

interface EbooksListProps {
  books: Book[]
  categoryStyles: CategoryStyles
}

export function EbooksList({
  books,
  categoryStyles,
}: EbooksListProps) {
  return (
    <div className="space-y-3">
      {books.map((book) => (
        <div
          key={book.id}
          className="flex cursor-pointer items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md"
        >
          <div className="size-16 overflow-hidden rounded-lg bg-muted">
            <img
              src={book.thumbnail}
              alt={book.title}
              className="size-full object-cover"
            />
          </div>

          <div className="flex-1">
            <h3 className="font-medium text-card-foreground">
              {book.title}
            </h3>

            <p className="text-sm text-muted-foreground">
              {book.team}
            </p>
          </div>

          <Badge
            className={cn(
              "text-xs",
              categoryStyles[book.category]
            )}
          >
            {book.category}
          </Badge>
        </div>
      ))}
    </div>
  )
}