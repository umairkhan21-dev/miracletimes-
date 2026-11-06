"use client";

import { InfoLayout } from "@/components/InfoLayout";
import { useT } from "@/components/LanguageProvider";
import { site } from "@/lib/site";

export function AboutContent() {
  const t = useT();
  return (
    <InfoLayout title={t("about.title")} lede={t("about.lede")}>
      <p>{t("about.p1")}</p>
      <h2>{t("about.h2Edition")}</h2>
      <p>{t("about.p2")}</p>
      <h2>{t("about.h2Desk")}</h2>
      <p>{t("about.p3")}</p>
    </InfoLayout>
  );
}

export function ContactContent() {
  const t = useT();
  return (
    <InfoLayout title={t("contact.title")} lede={t("contact.lede")}>
      <p>
        {t("contact.email")}{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>
      <p>
        {t("contact.location")} {site.address}
      </p>
      <h2>{t("contact.h2Topics")}</h2>
      <ul>
        <li>{t("contact.li1")}</li>
        <li>{t("contact.li2")}</li>
        <li>{t("contact.li3")}</li>
      </ul>
      <p>{t("contact.pForm")}</p>
    </InfoLayout>
  );
}

export function PrivacyContent() {
  const t = useT();
  return (
    <InfoLayout title={t("privacy.title")} lede={t("privacy.lede")}>
      <p>{t("privacy.p1")}</p>
      <h2>{t("privacy.h2NotStored")}</h2>
      <ul>
        <li>{t("privacy.li1")}</li>
        <li>{t("privacy.li2")}</li>
        <li>{t("privacy.li3")}</li>
      </ul>
      <p>{t("privacy.p2")}</p>
    </InfoLayout>
  );
}

export function TermsContent() {
  const t = useT();
  return (
    <InfoLayout title={t("terms.title")} lede={t("terms.lede")}>
      <p>{t("terms.p1")}</p>
      <h2>{t("terms.h2Content")}</h2>
      <p>{t("terms.p2")}</p>
      <p>{t("terms.p3")}</p>
    </InfoLayout>
  );
}

export function EditorialContent() {
  const t = useT();
  return (
    <InfoLayout title={t("editorial.title")} lede={t("editorial.lede")}>
      <p>{t("editorial.p1")}</p>
      <h2>{t("editorial.h2Photos")}</h2>
      <p>{t("editorial.p2")}</p>
      <h2>{t("editorial.h2Trending")}</h2>
      <p>{t("editorial.p3")}</p>
      <h2>{t("editorial.h2Health")}</h2>
      <p>{t("editorial.p4")}</p>
    </InfoLayout>
  );
}

export function DisclaimerContent() {
  const t = useT();
  return (
    <InfoLayout title={t("disclaimer.title")} lede={t("disclaimer.lede")}>
      <p>{t("disclaimer.p1")}</p>
      <p>{t("disclaimer.p2")}</p>
      <p>{t("disclaimer.p3")}</p>
    </InfoLayout>
  );
}

export function CorrectionsContent() {
  const t = useT();
  return (
    <InfoLayout title={t("corrections.title")} lede={t("corrections.lede")}>
      <p>{t("corrections.p1")}</p>
      <h2>{t("corrections.h2Write")}</h2>
      <p>
        {t("corrections.p2Before")}{" "}
        <a href={`mailto:${site.email}`}>{site.email}</a>
        {t("corrections.p2After")}
      </p>
      <p>{t("corrections.p3")}</p>
    </InfoLayout>
  );
}
