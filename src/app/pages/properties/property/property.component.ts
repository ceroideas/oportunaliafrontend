import {
  Component,
  inject,
  OnInit,
  ViewChild,
  HostListener,
  ViewChildren,
  QueryList,
} from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from 'src/app/app.service';
import moment from 'moment';
import {
  SwiperConfigInterface,
  SwiperDirective,
} from 'src/app/theme/components/swiper/swiper.module';
import { AppSettings, Settings } from 'src/app/app.settings';
import { CompareOverviewComponent } from 'src/app/shared/compare-overview/compare-overview.component';
import { emailValidator } from 'src/app/theme/utils/app-validators';
import { EmbedVideoService } from 'src/app/services/embed-video.service';
import { DomHandlerService } from 'src/app/dom-handler.service';
import { UserService } from 'src/app/api/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { UactionsService } from 'src/app/services/uactions.service';
import { PublicService } from 'src/app/api/public.service';
import {
  MatDialog,
  MAT_DIALOG_DATA,
  MatDialogTitle,
  MatDialogContent,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { BuyProccessComponent } from '../../buy-proccess/buy-proccess.component';

import { AnalyticsService } from '../../../services/analytics.service';

import { SnackbarComponent } from '../../../custom/snackbar/snackbar.component';

@Component({
  selector: 'app-property',
  templateUrl: './property.component.html',
  styleUrls: ['./property.component.scss'],
  providers: [EmbedVideoService],
})
export class PropertyComponent implements OnInit {
  @ViewChild('sidenav') sidenav: any;
  @ViewChildren(SwiperDirective) swipers: QueryList<SwiperDirective>;
  public sidenavOpen: boolean = true;
  public config: SwiperConfigInterface = {};
  public config2: SwiperConfigInterface = {};
  private sub: any;
  public property: any;
  public settings: Settings;
  public embedVideo: any;
  public relatedProperties: any[];
  public featuredProperties: any[];
  public agent: any;
  public selectedImage: Blob;
  public mortgageForm: UntypedFormGroup;
  public depositForm: UntypedFormGroup;
  public bidForm: UntypedFormGroup;
  public monthlyPayment: any;
  public contactForm: UntypedFormGroup;
  mapOptions: google.maps.MapOptions = {
    mapTypeControl: true,
    fullscreenControl: true,
    gestureHandling: 'greedy'
  };
  zoom: number = 10;
  lat: number = 0;
  lng: number = 0;
  auction_type: string = '';
  representations: any[] = [];
  import: any = 0;

  viewMap:any = false;

  markerOptions: google.maps.MarkerOptions = { draggable: false, icon: {url:'assets/marker.png', scaledSize: new google.maps.Size(60, 60)} };

  shareList:any = false;

  /* depositFulfilled = false;
  userVerified = false;
  auctionFavorite = false;
  auctionEnded = true;
  currentRoute=""; */

  constructor(
    public analyticsService: AnalyticsService,
    public appSettings: AppSettings,
    public appService: AppService,
    private activatedRoute: ActivatedRoute,
    private embedService: EmbedVideoService,
    public fb: UntypedFormBuilder,
    public userService: UserService,
    public snackBar: MatSnackBar,
    public sanitizer: DomSanitizer,
    private domHandlerService: DomHandlerService,
    public uactions: UactionsService,
    public route: ActivatedRoute,
    public publicService: PublicService,
  ) {
    this.settings = this.appSettings.settings;
    this.depositForm = this.fb.group({
      file: ['', [Validators.required]],
      /*import: ['', [Validators.required, Validators.minLength(1)]],
      representation_id: ['', [Validators.required]],*/
    });
    this.bidForm = this.fb.group({
      /*file: ['', [Validators.required]], */
      import: ['', [Validators.required, Validators.minLength(1)]],
      representation_id: ['', [Validators.required]],
    });
  }

  dialog = inject(MatDialog);

  openDialog() {
    this.dialog.open(BuyProccessComponent);
  }

  ngOnInit() {

    this.sub = this.activatedRoute.params.subscribe((params) => {
      this.getPropertyById(params['id']);
    });
    this.userService.getRepresentations().subscribe(({ response }: any) => {
      this.representations = response;
    });
    this.getRelatedProperties();
    this.getFeaturedProperties();
    this.getAgent(1);
    if (this.domHandlerService.window?.innerWidth < 960) {
      this.sidenavOpen = false;
      if (this.sidenav) {
        this.sidenav.close();
      }
    }
    this.mortgageForm = this.fb.group({
      principalAmount: ['', Validators.required],
      downPayment: ['', Validators.required],
      interestRate: ['', Validators.required],
      period: ['', Validators.required],
    });
    this.contactForm = this.fb.group({
      firstname: ['', Validators.required],
      message: [''],
      subject: ['', Validators.required],
      email: ['', Validators.compose([Validators.required, emailValidator])],
      phone: [''],
      lastname: [''],
      aceptaPrivacidad: [false, Validators.required]
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
  get fileInput() {
    return document.getElementById('fileInput') as HTMLInputElement;
  }
  @HostListener('window:resize')
  public onWindowResize(): void {
    this.domHandlerService.window?.innerWidth < 960
      ? (this.sidenavOpen = false)
      : (this.sidenavOpen = true);
  }

  public onBidFormSubmit(values: object) {
    if (this.bidForm.valid) {
      const formInfo = new FormData();

      for (const key in this.bidForm.value) {
        formInfo.append(key, this.bidForm.value[key]);
      }

      console.log(formInfo, values);

      this.userService.bid(formInfo, this.property.link_rewrite).subscribe(
        (response) => {
          console.log(response);
          /*this.snackBar.open('Oferta enviada exitosamente', '×', {
            panelClass: 'success',
            verticalPosition: 'top',
            duration: 3000,
          });*/
          this.snackBar.openFromComponent(SnackbarComponent, {
            duration: 3000,
            verticalPosition: 'top',
            panelClass: ['success'],
            data: { message: "Oferta enviada exitosamente" }
          });

          let id = this.property.link_rewrite;
          this.property = null;
          this.bidForm.value['import'] = null;
          this.getPropertyById(id);
        },
        (error) => {
          console.log(error);
          this.snackBar.open(
            'Ha ocurrido un error! ' + error['error']['messages'][0],
            '×',
            { panelClass: 'error', verticalPosition: 'top', duration: 3000 }
          );
        }
      );
    }
  }

  public onDepositFormSubmit(values: object) {
    console.log(this.depositForm.value, this.depositForm.valid);

    if (this.depositForm.valid) {
      const formInfo = new FormData();

      for (const key in this.depositForm.value) {
        if (values.hasOwnProperty(key) && key !== 'file') {
          formInfo.append(key, this.depositForm.value[key]);
        } else {
          formInfo.append(key, this.selectedImage, this.selectedImage.name);
        }
      }

      console.log(formInfo, values);

      this.userService.deposit(formInfo, this.property.link_rewrite).subscribe(
        (response) => {
          console.log(response);
          /*this.snackBar.open('Deposito enviado exitosamente', '×', {
            panelClass: 'success',
            verticalPosition: 'top',
            duration: 3000,
          });*/
          this.snackBar.openFromComponent(SnackbarComponent, {
            duration: 3000,
            verticalPosition: 'top',
            panelClass: ['success'],
            data: { message: "Deposito enviado exitosamente" }
          });
        },
        (error) => {
          console.log(error);
          this.snackBar.open(
            'Ha ocurrido un error! ' + error['error']['messages'][0],
            '×',
            { panelClass: 'error', verticalPosition: 'top', duration: 3000 }
          );
        }
      );
    }
  }

  public onRepresentationChange(representationId) {
    this.bidForm.setValue({ representation_id: representationId });
  }

  public onFileChange(ev) {
    this.selectedImage = ev.target.files[0];
  }

  public transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }

  public calculateLeftTime1(): void {
    const propertyCard: any = document.querySelector(
      `.left-time1-${this.property.guid}`
    );
    const timeToEnd: any = new Date(this.property.end_date_original);

    const interval = setInterval(() => {
      try {
        const now = new Date();
        const leftTime = moment.duration(moment(timeToEnd).diff(moment(now)));

        const days = Math.floor(leftTime.asDays());
        const hours = leftTime.hours().toString().padStart(2, '0');
        const minutes = leftTime.minutes().toString().padStart(2, '0');
        const seconds = leftTime.seconds().toString().padStart(2, '0');

        if (leftTime.asMilliseconds() <= 0) {
          clearInterval(interval);
          propertyCard.textContent = "00D 00:00:00";
        } else {
          propertyCard.textContent = `${days}D ${hours}:${minutes}:${seconds}`;
        }
      } catch (e) {
        console.log(e);
        clearInterval(interval);
      }
    }, 1000);
  }


  public getPropertyById(id: number) {
    this.property = null;
    this.appService.getPropertyById(id).subscribe((data) => {
      console.log('getPropertyById');
      this.property = data.response;

      this.analyticsService.trackEvent("property loaded",this.property.link_rewrite,"properties");

      this.import = this.property.start_price;
      this.bidForm.patchValue({'import':this.import});

      if (!this.property.lat || !this.property.lng) {
        this.geocodeAddress(this.property.city+', '+this.property.address+', '+this.property.province+', España',this.property.active_id);
      }else{
        this.lat = parseFloat(this.property.lat);
        this.lng = parseFloat(this.property.lng);
        this.viewMap = true;
      }

      console.log(data.response, 'AS');
      setTimeout(() => {
        this.calculateLeftTime1();
      }, 1000);

      this.property.start_date = moment(this.property.start_date).format(
        'DD-MM-YYYY'
      );
      this.property.end_date_original = this.property.end_date;
      this.property.end_date = moment(this.property.end_date).format(
        'DD-MM-YYYY'
      );

      this.embedVideo = this.property.videos.length
        ? this.embedService.embed(this.property.videos[1].link)
        : null;
      /*this.lat = +this.property.location.lat;
      this.lng = +this.property?.location.lng;*/
      if (this.property.auction_type_id == 1) {
        this.auction_type = 'Subasta';
      } else if (this.property.auction_type_id == 2) {
        this.auction_type = 'Venta directa';
      } else {
        this.auction_type = 'Cesión de remate';
      }
      setTimeout(() => {
        this.config.observer = true;
        this.config2.observer = true;
        this.swipers.forEach((swiper) => {
          if (swiper) {
            swiper.setIndex(0);
          }
        });
      });
    });
  }

  ngAfterViewInit() {
    this.config = {
      observer: false,
      slidesPerView: 1,
      spaceBetween: 0,
      keyboard: true,
      navigation: true,
      pagination: false,
      grabCursor: true,
      loop: false,
      preloadImages: false,
      lazy: true,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
      },
    };

    this.config2 = {
      observer: false,
      slidesPerView: 4,
      spaceBetween: 16,
      keyboard: true,
      navigation: false,
      pagination: false,
      grabCursor: true,
      loop: false,
      preloadImages: false,
      lazy: true,
      breakpoints: {
        200: {
          slidesPerView: 2,
        },
        480: {
          slidesPerView: 3,
        },
        600: {
          slidesPerView: 4,
        },
      },
    };
  }

  public onOpenedChange() {
    this.swipers.forEach((swiper) => {
      if (swiper) {
        swiper.update();
      }
    });
  }

  public selectImage(index: number) {
    console.log(index);
    this.swipers.forEach((swiper) => {
      if (swiper['elementRef'].nativeElement.id == 'main-carousel') {
        swiper.setIndex(index);
      }
    });
  }

  public onIndexChange(index: number) {
    this.swipers.forEach((swiper) => {
      let elem = swiper['elementRef'].nativeElement;
      if (elem.id == 'small-carousel') {
        swiper.setIndex(index);
        for (let i = 0; i < elem.children[0].children.length; i++) {
          const element = elem.children[0].children[i];
          if (element.classList.contains('thumb-' + index)) {
            element.classList.add('active-thumb');
          } else {
            element.classList.remove('active-thumb');
          }
        }
      }
    });
  }

  public addToCompare() {
    this.appService.addToCompare(
      this.property,
      CompareOverviewComponent,
      this.settings.rtl ? 'rtl' : 'ltr'
    );
  }

  public onCompare() {
    return this.appService.Data.compareList.filter(
      (item) => item.id == this.property.id
    )[0];
  }

  public addToFavorites() {
    this.appService.addToFavorites(
      this.property,
      this.settings.rtl ? 'rtl' : 'ltr'
    );
  }

  public onFavorites() {
    return this.appService.Data.favorites.filter(
      (item) => item.id == this.property.id
    )[0];
  }

  public getRelatedProperties() {
    this.appService.getRelatedProperties().subscribe((properties: any) => {
      this.relatedProperties = properties.response;
    });
  }

  public getFeaturedProperties() {
    this.appService.getFeaturedProperties().subscribe((properties) => {
      console.log(properties);
      this.featuredProperties = properties.response; //.slice(0,3);
    });
  }

  public getAgent(agentId: number = 1) {
    var ids = [1, 2, 3, 4, 5]; //agent ids
    agentId = ids[Math.floor(Math.random() * ids.length)]; //random agent id
    this.agent = this.appService
      .getAgents()
      .filter((agent) => agent.id == agentId)[0];
  }

  public onContactFormSubmit(values: Object) {
    this.contactForm.patchValue({
      subject: this.property.title
    })
    if (this.contactForm.valid) {
      this.publicService.sendContactData(values)
      .subscribe((_) => this.appService.openAlertDialog('Mensaje enviado'),
        (_) => this.appService.openAlertDialog('Error al enviar mensaje'));
    }
  }

  public onMortgageFormSubmit(values: Object) {
    if (this.mortgageForm.valid) {
      var principalAmount = values['principalAmount'];
      var down = values['downPayment'];
      var interest = values['interestRate'];
      var term = values['period'];
      this.monthlyPayment = this.calculateMortgage(
        principalAmount,
        down,
        interest / 100 / 12,
        term * 12
      ).toFixed(2);
    }
  }
  public calculateMortgage(
    principalAmount: any,
    downPayment: any,
    interestRate: any,
    period: any
  ) {
    return (
      ((principalAmount - downPayment) * interestRate) /
      (1 - Math.pow(1 + interestRate, -period))
    );
  }

  public showInfo() {
    const message = 'deposit';
    let dialogRef = this.appService.showInfoMessage(message);
  }

  public showConfirmation() {
    const message = 'enviado';
    let dialogRef = this.appService.showInfoMessage(message);
  }

  onSubmit() {
    const value = { import: +this.import };
    console.log(value);

    if (!this.import || this.import < 1) {
      return;
    }

    this.userService.directSale(value, this.property.link_rewrite).subscribe(
      (response) => {
        console.log(response);
        /*this.snackBar.open('Oferta enviada exitosamente', '×', {
          panelClass: 'success',
          verticalPosition: 'top',
          duration: 3000,
        });*/
        this.snackBar.openFromComponent(SnackbarComponent, {
          duration: 3000,
          verticalPosition: 'top',
          panelClass: ['success'],
          data: { message: "Oferta enviada exitosamente" }
        });

        let id = this.property.link_rewrite;
        this.property = null;
        this.bidForm.value['import'] = null;
        this.getPropertyById(id);
      },
      (error) => {
        console.log(error);
        this.snackBar.open(
          'Ha ocurrido un error! ' + error['error']['messages'][0],
          '×',
          { panelClass: 'error', verticalPosition: 'top', duration: 3000 }
        );
      }
    );
  }

  geocodeAddress(address: string,active_id): void {
    this.uactions.getCoordinates(address).subscribe(response => {
      console.log(address);
      if (response.status === 'OK') {

        if (response.results.length > 0) {
          var location = response.results[1].geometry.location;
        }else{
          var location = response.results[0].geometry.location;
        }

        this.lat = location.lat;
        this.lng = location.lng;
        this.viewMap = true;

        this.appService.saveLatLng({active_id,lat:location.lat,lng:location.lng}).subscribe(data=>{
          console.log('saved');
        });

      } else {
        console.error('Geocoding error:', response.status);
      }
    });
  }

  copyUrl(url)
  {
    navigator.clipboard.writeText(url)
    .then(() => {
      this.snackBar.openFromComponent(SnackbarComponent, {
        duration: 3000,
        verticalPosition: 'top',
        panelClass: ['success'],
        data: { message: 'URL copiada al portapapeles' }
      });
    })
    .catch(err => {
      console.error('Error al copiar al portapapeles:', err)
    })
  }
}
