"use client";

import { ActionForm, FormError, FormStatus, SubmitButton, TextInput } from "@/components/admin/form-kit";
import { changePasswordAction } from "../../actions";

export function PasswordForm() {
  return (
    <ActionForm action={changePasswordAction} className="grid max-w-md gap-4" resetOnSuccess>
      <input type="text" name="username" autoComplete="username" hidden readOnly />
      <TextInput name="current" label="Contraseña actual" type="password" autoComplete="current-password" required />
      <TextInput name="next" label="Contraseña nueva" type="password" autoComplete="new-password" minLength={12} hint="Mínimo 12 caracteres. Una frase larga es más segura." required />
      <TextInput name="confirm" label="Repite la contraseña nueva" type="password" autoComplete="new-password" required />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton>Cambiar contraseña</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}
