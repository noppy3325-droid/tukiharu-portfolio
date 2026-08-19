CREATE TABLE `adminLoginAttempts` (
	`keyHash` varchar(64) NOT NULL,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`windowStartedAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminLoginAttempts_keyHash` PRIMARY KEY(`keyHash`)
);
