import { Badge } from "@/components/ui/badge"

import { cn } from "@/lib/utils"

import { Book, CategoryStyles } from "@/services/ebooks.types"

interface EbooksGridProps {
  books: Book[]
  categoryStyles: CategoryStyles
}

export function EbooksGrid({
  books,
  categoryStyles,
}: EbooksGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {books.map((book) => (
        <div
          key={book.id}
          className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg"
        >
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={book.thumbnail}
              alt={book.title}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          </div>

          <div className="p-4">
            <h3 className="mb-2 line-clamp-2 font-medium text-card-foreground">
              {book.title}
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {book.team}
              </span>

              <Badge
                className={cn(
                  "text-xs",
                  categoryStyles[book.category]
                )}
              >
                {book.category}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}