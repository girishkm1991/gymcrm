import { db, Settings } from "../database/database";
import { AuditService } from "./audit.service";

export class SettingsService {
  /**
    * Fetch settings for a given gym. Creates a default config if it doesn't exist.
    */
  public static getSettings(gymId: string): Settings {
    const settingsList = db.getSettings();
    let gymSettings = settingsList.find(s => s.gymId === gymId);
    
    if (!gymSettings) {
      // Create lazy default settings for a newly registered gym tenant
      gymSettings = {
        id: "set-" + Math.floor(100000 + Math.random() * 900000),
        gymId,
        gymName: "Standard Gym Club",
        logo: "",
        address: "123 Fitness Way",
        phone: "+1-555-0100",
        email: "gym@gymflow.com",
        gstNumber: "",
        currency: "USD",
        workingHours: "06:00 AM - 10:00 PM",
        receiptFooter: "Keep grinding, lift hard!",
        paymentQr: "",
        taxPercentage: 11,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      settingsList.push(gymSettings);
      db.save();
    }
    
    return gymSettings;
  }

  /**
    * Update gym settings and make an audit log
    */
  public static updateSettings(
    gymId: string, 
    params: Partial<Omit<Settings, "id" | "gymId">>, 
    actor: { id: string; name: string; role: string; ipAddress?: string }
  ): Settings {
    const settings = this.getSettings(gymId);
    
    if (params.gymName !== undefined) settings.gymName = params.gymName;
    if (params.logo !== undefined) settings.logo = params.logo;
    if (params.address !== undefined) settings.address = params.address;
    if (params.phone !== undefined) settings.phone = params.phone;
    if (params.email !== undefined) settings.email = params.email;
    if (params.gstNumber !== undefined) settings.gstNumber = params.gstNumber;
    if (params.currency !== undefined) settings.currency = params.currency;
    if (params.workingHours !== undefined) settings.workingHours = params.workingHours;
    if (params.receiptFooter !== undefined) settings.receiptFooter = params.receiptFooter;
    if (params.paymentQr !== undefined) settings.paymentQr = params.paymentQr;
    if (params.taxPercentage !== undefined) settings.taxPercentage = Number(params.taxPercentage);
    
    settings.updatedAt = new Date().toISOString();
    db.save();

    AuditService.log({
      gymId,
      userId: actor.id,
      userName: actor.name,
      userRole: actor.role,
      action: "Settings Updated",
      details: `Modified Gym configuration profile parameters.`,
      ipAddress: actor.ipAddress
    });

    return settings;
  }
}
