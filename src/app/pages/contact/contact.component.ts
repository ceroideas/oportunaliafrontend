import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { PublicService } from 'src/app/api/public.service';
import { AppService } from 'src/app/app.service';
import { emailValidator } from 'src/app/theme/utils/app-validators';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent implements OnInit {
  contactForm: UntypedFormGroup;
  center: google.maps.LatLngLiteral = { lat: 40.678178, lng: -73.944158};
  zoom: number = 12;
  markerOptions: google.maps.MarkerOptions = { draggable: false };
  markerPositions: google.maps.LatLngLiteral[] = [
    { lat: 40.678178, lng: -73.944158 }
  ];
  mapOptions: google.maps.MapOptions = {
    fullscreenControl: true,
    mapTypeControl: true
  }

  constructor(public formBuilder: UntypedFormBuilder,
    public publicService: PublicService,
    public appService: AppService
  ) { }

  ngOnInit() {

    this.contactForm = this.formBuilder.group({
      firstname: ['', Validators.required],
      message: ['', Validators.required],
      subject: ['', Validators.required],
      email: ['', Validators.compose([Validators.required, emailValidator])],
      phone: ['', Validators.required],
      lastname: ['', Validators.required],
      aceptaPrivacidad: [false, Validators.required]
    });
  }
  public onContactFormSubmit(values:Object):void {
    if (this.contactForm.valid) {
      this.publicService.sendContactData(values)
      .subscribe((_) => this.appService.openAlertDialog('Mensaje enviado'),
        (_) => this.appService.openAlertDialog('Error al enviar mensaje'));
    }
  }
}
