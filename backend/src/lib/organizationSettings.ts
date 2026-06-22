import OrganizationSettings from '../models/OrganizationSettings';
import { canPerformOrgAction, OrgMemberAttributes } from './abac';
import { mergePanicButtonSettings, PanicButtonSettings } from './panicButton';
import { canExecutePanicInOrg, getPanicEligibleProjectsForOrg } from './panicProjects';

export async function getOrganizationPanicSettings(
  organizationId: string
): Promise<PanicButtonSettings> {
  const settings = await OrganizationSettings.findOne({ organizationId });
  return mergePanicButtonSettings(settings?.panicButton);
}

export async function getOrganizationSettingsPayload(
  organizationId: string,
  userId: string,
  actor: OrgMemberAttributes
) {
  const panicButton = await getOrganizationPanicSettings(organizationId);
  const canConfigure = canPerformOrgAction(actor, 'org:configure_panic');
  const canExecute = await canExecutePanicInOrg(userId, organizationId);
  const eligibleProjects = canExecute
    ? await getPanicEligibleProjectsForOrg(userId, organizationId)
    : [];

  return {
    panicButton,
    canConfigure,
    canExecute,
    eligibleProjectCount: eligibleProjects.length,
  };
}

export async function upsertOrganizationPanicSettings(
  organizationId: string,
  panicButton: Partial<PanicButtonSettings>
): Promise<PanicButtonSettings> {
  let settings = await OrganizationSettings.findOne({ organizationId });

  if (!settings) {
    settings = await OrganizationSettings.create({
      organizationId,
      panicButton: mergePanicButtonSettings(panicButton),
    });
  } else {
    settings.panicButton = mergePanicButtonSettings({
      ...settings.panicButton,
      ...panicButton,
    });
    await settings.save();
  }

  return mergePanicButtonSettings(settings.panicButton);
}
