# The deploy files as an image (SCRUM-47). CI pushes it with the same tags as the app images.
# The SSM document squadmeet-deploy pulls the image for one tag and copies the two files to
# the host, so a change to them ships with the deploy and a rollback takes the old files.
# Nothing runs in this image; it only carries files.
FROM scratch
COPY compose.yml host-deploy.sh /
