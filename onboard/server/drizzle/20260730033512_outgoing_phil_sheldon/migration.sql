CREATE TABLE `driver_profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`age` integer NOT NULL,
	`licenseType` text NOT NULL,
	`yearsExperience` text NOT NULL,
	`mechanicalActions` text NOT NULL,
	`selfRatedProficiency` text NOT NULL,
	`preferredGuidanceStyle` text NOT NULL,
	`physicalLimitations` text NOT NULL,
	`physicalLimitationsOther` text,
	`maintenanceRelationship` text
);
