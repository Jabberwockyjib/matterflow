PNPM := pnpm

.PHONY: setup dev lint test typecheck supabase-start

setup:
	$(PNPM) install

dev:
	$(PNPM) dev

lint:
	$(PNPM) lint

test:
	$(PNPM) test

typecheck:
	$(PNPM) tsc --noEmit

supabase-start:
	@echo "Stub: start Supabase locally once configured (e.g., supabase start)"
