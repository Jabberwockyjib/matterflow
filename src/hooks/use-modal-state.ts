"use client";

import { useState, useCallback } from "react";

interface UseModalStateReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string;
  setError: (error: string) => void;
  reset: () => void;
  openModal: () => void;
}

export function useModalState(defaultOpen = false): UseModalStateReturn {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setLoading(false);
    setError("");
  }, []);

  const openModal = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  return { open, setOpen, loading, setLoading, error, setError, reset, openModal };
}
