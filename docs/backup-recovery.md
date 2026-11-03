# Verifierad backup och återställning

## Resultat 2026-11-03

Stagingprojektet `feubwwglcqbwrurpvpwk` har verifierats med två isolerade lokala
återställningar. Inga källdata eller andra projekt ändras av övningarna.

- `hosted-application-restore.mjs`: 31 publika tabeller, 31 RLS-tabeller,
  45 policyer, 17 migrationsposter, exakta radantal och negativa åtkomsttester.
- `hosted-auth-restore.mjs`: sex riktiga återställda syntetiska Auth-identiteter
  med samma UUID och bcrypt-lösenord. Alla sex kan logga in. Tre ursprungliga
  TOTP-faktorer fungerar utan återregistrering och ger AAL2. Lösenord ensamt
  ger AAL1. Fel lösenord och fel TOTP nekas.
- Sessioner, refresh tokens och challenges återställs inte. De återställda
  kontona måste logga in på nytt. Tillfällig Auth har en egen JWT-nyckel.
- Den färska read-only-inventeringen visar 0 Storage-objekt och 0 Vault-hemligheter.

Auth-övningen kräver exakt sex kända `@example.test`-identiteter och enbart bcrypt
och Base32-TOTP. Den vägrar verkliga konton, fjärrmål, befintlig måldatabas eller
container, krypterat/okänt MFA-format och icke-tomma återställningstokens.
Originalets globala databasroller och lösenord ändras inte. Endast den egna
tillfälliga databasen och containern städas bort.

Kör från reporoten med den isolerade lokala stacken startad:

```text
node --env-file=.env.platform.local scripts/hosted-application-restore.mjs
node --env-file=.env.platform.local scripts/hosted-auth-restore.mjs
```

Exporterna och handoff-filerna måste finnas i den ignorerade `.test-platform`.
Dessa tester ska aldrig göras till generiska produktionsverktyg genom att ta
bort mål- eller identitetsspärrarna.

## Portabel krypterad kopia

En färsk dataexport och schema, roller samt migrationshistorik har paketerats
som standard-tar, krypterat med befintlig GnuPG 2.4.9/OpenPGP AES256 och en
slumpmässig 256-bitars återställningsnyckel. Inga nya paket installerades.
Manifestet innehåller SHA-256 för de fem SQL-filerna. Dekrypterad tar jämfördes
byte för byte med originalet; fel nyckel nekades.

Privat lagringsrot: `%LOCALAPPDATA%/CFD-Sweden/private-backups/`.
Arkiv ligger under `archives/`, nyckel under `recovery-keys/`. NTFS tillåter bara
operatören, SYSTEM och lokala administratörer. Exakta filnamn och arkivets
kontrollsumma finns i ignorerad `.test-platform/portable-backup-report.json`.
Varken nyckeln, arkivet eller dataexporterna ska publiceras i Git/PR/chatt.

Återställning på en annan betrodd dator med GnuPG och tar:

```text
gpg --output staging-backup.tar --decrypt staging-backup.tar.gpg
tar -tf staging-backup.tar
```

Ange nyckeln i GnuPGs lösenordsdialog, aldrig som kommandoradsargument. Packa
upp endast i en ny privat katalog, kontrollera filernas manifest/checksummor
och följ den granskade schema-/Auth-processen. Att dekryptera ett tar-arkiv
importerar ingenting till en databas.

**Ägarens nuvarande beslut:** den krypterade syntetiska stagingkopian får ligga
lokalt tills vidare. Nyckeln hålls separat. Det skyddar inte mot förlust av datorn;
ingen privat backup har laddats upp till en extern tjänst utan ett valt mål.

## Vad bevisen inte omfattar

Detta är provad lokal SQL-/konto-/MFA-återställning, inte en full hostad
katastrofåterställning till ett nytt Supabase-projekt. Cloud-konfiguration,
JWT/API-nycklar, Vault-kryptering och Storage-filer ingår inte i det provet.
En framtida export med krypterade MFA-faktorer kräver en ny verifierad process.
Produktionen har en lokalt, DPAPI-skyddad baslinje före migrering. En krypterad
post-release-backup tas efter att domänsläppet och den verkliga MFA-kontrollen är klara.
Hostad katastrofåterställning är fortfarande inte provad.

[Supabases Auth-migreringsguide](https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects)
beskriver bevarande av lösenordshashar och att andra JWT-nycklar ogiltigförklarar
tidigare sessioner. [CLI-backupguiden](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
beskriver separat hantering av schema, data och egna Auth/Storage-anpassningar.
