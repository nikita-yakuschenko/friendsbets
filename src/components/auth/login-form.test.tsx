import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/login-form";

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
  loginAction: vi.fn(),
}));

describe("LoginForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("рендерит поля email и пароль", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^пароль$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /войти/i })).toBeInTheDocument();
  });

  it("показывает ссылку на регистрацию", () => {
    render(<LoginForm />);
    const links = screen.getAllByRole("link", { name: /зарегистрироваться/i });
    expect(links[0]).toHaveAttribute("href", "/register");
  });
});
