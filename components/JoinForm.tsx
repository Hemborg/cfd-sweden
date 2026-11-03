import { ArrowIcon } from "@/components/Header";
import { formContent, homeContent, site } from "@/content/site";

export function JoinForm() {
  return <aside className="form-panel form-card" aria-labelledby="form-title">
    <h2 id="form-title">{homeContent.formHeading.firstLine}<span>{homeContent.formHeading.secondLine}</span></h2>
    <form action={site.form.action} method="POST">
      <input type="hidden" name="_next" value={site.form.redirectUrl} />
      <input type="hidden" name="_subject" value={site.form.subject} />
      <input type="text" name="_honey" style={{ display: "none" }} />
      <input type="hidden" name="_captcha" value="false" />
      <div className="field-row">{homeContent.fields.slice(0, 2).map((field) => <label className="field full" key={field.name}>{field.label}<input name={field.name} type={field.type} /></label>)}</div>
      <div className="field-grid"><label className="field">{formContent.countryLabel}<select name="country" defaultValue="Sverige">{formContent.countries.map((country) => <option key={country}>{country}</option>)}</select></label>{homeContent.fields.slice(2, 4).map((field) => <label className="field" key={field.name}>{field.label}<input name={field.name} type={field.type} /></label>)}<label className="field">{formContent.regionLabel}<select name="region" defaultValue=""><option value="">{formContent.regionPlaceholder}</option>{formContent.regions.map((region) => <option key={region}>{region}</option>)}</select></label></div>
      <div className="field-row">{homeContent.fields.slice(4).map((field) => <label className="field full" key={field.name}>{field.label}<input name={field.name} type={field.type} /></label>)}</div>
      <label className="field full">{formContent.messageLabel}<textarea name="message" rows={5} /></label>
      <button className="submit-button" type="submit">{formContent.submitLabel} <ArrowIcon /></button>
    </form>
  </aside>;
}
