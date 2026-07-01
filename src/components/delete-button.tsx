"use client";

export default function DeleteButton({
  action,
  confirmMessage,
  label = "Sil",
}: {
  action: () => void;
  confirmMessage: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        {label}
      </button>
    </form>
  );
}
