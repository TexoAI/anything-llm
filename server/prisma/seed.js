const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const isAutoDeployment = process.env.DEPLOY_MODE === 'auto';
  
  console.log(`🌱 Seeding database (${isAutoDeployment ? 'auto-deployment' : 'standard'} mode)...`);
  
  // Base system settings that are always needed
  const baseSettings = [
    { label: "logo_filename", value: process.env.DEFAULT_LOGO_FILENAME || "codex-logo.png" },
  ];
  
  // Additional settings for auto-deployment
  const autoDeploymentSettings = [
    { label: "multi_user_mode", value: process.env.DEFAULT_MULTI_USER_MODE || "true" },
    { label: "custom_app_name", value: process.env.DEFAULT_APP_NAME || "Codex" },
    { label: "text_splitter_chunk_size", value: "1000" },
    { label: "text_splitter_chunk_overlap", value: "20" },
  ];
  
  // Standard deployment settings (for backward compatibility)
  const standardSettings = [
    { label: "multi_user_mode", value: "false" },
  ];
  
  // Combine settings based on deployment mode
  const settings = isAutoDeployment 
    ? [...baseSettings, ...autoDeploymentSettings]
    : [...baseSettings, ...standardSettings];

  console.log(`📝 Applying ${settings.length} system settings...`);

  for (let setting of settings) {
    try {
      const existing = await prisma.system_settings.findUnique({
        where: { label: setting.label },
      });

      // Only create the setting if it doesn't already exist
      if (!existing) {
        await prisma.system_settings.create({
          data: setting,
        });
        console.log(`   ✅ Created setting: ${setting.label} = ${setting.value}`);
      } else {
        console.log(`   ⏭️  Setting already exists: ${setting.label} = ${existing.value}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to create setting ${setting.label}:`, error.message);
    }
  }
  
  // Check if this is the first run and auto-deployment is not enabled
  if (!isAutoDeployment) {
    const userCount = await prisma.users.count();
    if (userCount === 0) {
      console.log("💡 No users found and auto-deployment is disabled.");
      console.log("💡 You may want to set DEPLOY_MODE=auto for automatic setup.");
      console.log("💡 Or create users manually through the application interface.");
    }
  }
  
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Database seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
