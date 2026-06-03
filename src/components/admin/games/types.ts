export type AdminGameRow = {
  id: string;
  title: string;
  inviteCode: string;
  inviteLinkUrl: string;
  /** Пользователь, создавший запись Game (не меняется при смене организаторов). */
  createdByName: string;
  organizerLabel: "Организатор" | "Организаторы";
  /** Текущие организаторы; пустая строка, если никого не назначили. */
  organizerNames: string;
  createdAt: string;
  scoringRuleTitle: string;
  participantsCount: number;
  /** Куда ведёт клик по карточке / «Открыть». */
  openHref: string;
};
