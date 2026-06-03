import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegisterForm } from "@/components/auth/register-form";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/server/actions/auth", () => ({
  registerAction: vi.fn(),
}));

describe("RegisterForm", () => {
  it("рендерит поля регистрации", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/имя/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^пароль$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /зарегистрироваться/i }),
    ).toBeInTheDocument();
  });
});
