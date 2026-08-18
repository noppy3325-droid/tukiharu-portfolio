CREATE TABLE `adminCredentials` (
	`id` int NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`passwordSalt` varchar(128) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminCredentials_id` PRIMARY KEY(`id`)
);
