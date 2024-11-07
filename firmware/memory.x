MEMORY {
    BOOT2   : ORIGIN = 0x10000000, LENGTH = 0x100
    FLASH   : ORIGIN = 0x10000100, LENGTH = 0x180000 /* 1.5 MB */
	PROFILE : ORIGIN = 0x10180100, LENGTH = 524032 /* 500 KB - BOOT2 */
    RAM     : ORIGIN = 0x20000000, LENGTH = 256K
}

EXTERN(BOOT2_FIRMWARE)

SECTIONS {
    /* ### Boot loader */
    .boot2 ORIGIN(BOOT2) :
    {
        KEEP(*(.boot2));
    } > BOOT2
	/* profile data */
	.profile : {
		*(.profile);
	} > PROFILE
} INSERT BEFORE .text;