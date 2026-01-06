"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { VisibilityType } from "@/components/visibility-selector";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const router = useRouter();

  const { data: visibilityType, mutate: setLocalVisibility } = useSWR(
    `${chatId}-visibility`,
    null,
    {
      fallbackData: initialVisibilityType,
    }
  );

  const setVisibilityType = (updatedVisibilityType: VisibilityType) => {
    setLocalVisibility(updatedVisibilityType);

    fetch(`/api/chatv2?id=${chatId}`, {
      method: "PATCH",
      body: JSON.stringify({ visibility: updatedVisibilityType }),
    }).then(() => {
      router.refresh();
    });
  };

  return { visibilityType, setVisibilityType };
}
